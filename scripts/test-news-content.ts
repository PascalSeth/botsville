import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canManageNews, resolveNewsFormat } from '../lib/news-content';
import { getNewsPresentation, getNewsImages, isAnimatedNewsImage } from '../lib/news-presentation';
import { validateNewsWrite, parseNewsQuery } from '../lib/news-validation';

const draft = { title: 'One more game?', category: 'BANTER', format: 'MEME', status: 'DRAFT' };

test('explicit formats control layout regardless of caption length or legacy tags', () => {
  assert.equal(getNewsPresentation({ format: 'ARTICLE', body: 'A short but complete report.', tags: ['memes'] }).isLongForm, true);
  assert.equal(getNewsPresentation({ format: 'MEME', body: 'A long caption. '.repeat(200) }).isLongForm, false);
  assert.equal(getNewsPresentation({ format: 'QUICK_POST', body: 'A long update. '.repeat(200) }).isLongForm, false);
});

test('legacy records retain their previous presentation until migrated', () => {
  assert.equal(resolveNewsFormat({ tags: ['#Memes'] }), 'MEME');
  assert.equal(resolveNewsFormat({ body: 'word '.repeat(160) }), 'ARTICLE');
  assert.equal(resolveNewsFormat({ body: 'word '.repeat(159) }), 'QUICK_POST');
  assert.equal(resolveNewsFormat({ body: '\n  \t' }), 'QUICK_POST');
});

test('meme drafts may be incomplete, but publishing requires media', () => {
  const { post } = validateNewsWrite(draft);
  assert.equal(post.image, null);
  assert.throws(() => validateNewsWrite({ status: 'PUBLISHED' }, post), /image or GIF/);
  assert.equal(validateNewsWrite({ status: 'PUBLISHED', images: ['/meme.gif'] }, post).post.format, 'MEME');
});

test('a published meme cannot lose all its media through an edit', () => {
  const { post } = validateNewsWrite({ ...draft, status: 'PUBLISHED', image: '/meme.png' });
  assert.throws(() => validateNewsWrite({ image: null, images: [] }, post), /image or GIF/);
  assert.equal(validateNewsWrite({ status: 'DRAFT', image: null }, post).post.image, null);
});

test('news stories need body text to publish; quick text-only posts do not', () => {
  assert.throws(() => validateNewsWrite({ ...draft, format: 'ARTICLE', status: 'PUBLISHED' }), /story text/);
  assert.equal(validateNewsWrite({ ...draft, format: 'ARTICLE', status: 'PUBLISHED', body: 'Short report.' }).post.format, 'ARTICLE');
  assert.equal(validateNewsWrite({ ...draft, format: 'QUICK_POST', status: 'PUBLISHED' }).post.status, 'PUBLISHED');
});

test('updates preserve the selected format and credits unless changed explicitly', () => {
  const { post } = validateNewsWrite({ ...draft, sourceName: 'Creator', sourceUrl: 'https://example.com/original', tags: ['ranked'] });
  const result = validateNewsWrite({ title: 'Updated caption' }, post);
  assert.equal(result.post.format, 'MEME');
  assert.equal(result.post.sourceName, 'Creator');
  assert.deepEqual(result.changes, { title: 'Updated caption' });
  assert.equal(validateNewsWrite({ sourceName: null, sourceUrl: null }, post).post.sourceUrl, null);
});

test('old clients can still create posts without an explicit format', () => {
  assert.equal(validateNewsWrite({ title: 'Hello', body: 'word '.repeat(200) }).post.format, 'ARTICLE');
  assert.equal(validateNewsWrite({ title: 'Hello', tags: ['memes'] }).post.format, 'MEME');
  assert.equal(validateNewsWrite({ title: 'Hello' }).post.category, 'COMMUNITY');
});

test('invalid types, enum values, oversized fields and unsafe URLs are rejected', () => {
  for (const input of [null, [], 'post', { title: '   ' }, { ...draft, format: 'VIDEO' }, { ...draft, category: '__proto__' }, { ...draft, status: 'LIVE' }, { ...draft, featured: 'false' }, { ...draft, title: 'x'.repeat(181) }, { ...draft, tags: [3] }, { ...draft, images: Array(13).fill('/a.png') }, { ...draft, sourceUrl: 'javascript:alert(1)' }, { ...draft, image: '//example.com/image.png' }, { ...draft, image: '/\\example.com/image.png' }]) {
    assert.throws(() => validateNewsWrite(input));
  }
  assert.throws(() => validateNewsWrite({}, validateNewsWrite(draft).post), /No post fields/);
});

test('media and tags normalize without discarding the image-only use case', () => {
  const { post } = validateNewsWrite({ ...draft, status: 'PUBLISHED', images: [' /meme.gif ', '/meme.gif'], tags: ['ranked', ' ranked '] });
  assert.deepEqual(post.images, ['/meme.gif']);
  assert.deepEqual(post.tags, ['ranked']);
  assert.deepEqual(getNewsImages({ image: ' ', images: post.images }), ['/meme.gif']);
  assert.equal(getNewsPresentation(post).readingMinutes, null);
  assert.equal(isAnimatedNewsImage('https://example.com/meme.GIF?signature=test'), true);
});

test('format and topic filters compose, and legacy quick-post links keep working', () => {
  assert.deepEqual(parseNewsQuery(new URLSearchParams('format=MEME&category=BANTER&limit=10&skip=20')).formats, ['MEME']);
  assert.equal(parseNewsQuery(new URLSearchParams('category=ESPORTS')).category, 'ESPORTS');
  assert.deepEqual(parseNewsQuery(new URLSearchParams('format=posts')).formats, ['QUICK_POST', 'MEME']);
  assert.deepEqual(parseNewsQuery(new URLSearchParams('format=ARTICLE')).formats, ['ARTICLE']);
  for (const query of ['format=__proto__', 'format=VIDEO', 'category=MEME', 'status=LIVE', 'limit=-1', 'limit=0', 'limit=101', 'limit=abc', 'skip=-1', 'skip=3.5', 'featured=maybe']) {
    assert.throws(() => parseNewsQuery(new URLSearchParams(query)));
  }
});

test('only news staff can request unpublished content', () => {
  for (const role of ['SUPER_ADMIN', 'CONTENT_ADMIN', 'EDITOR', 'INTERVIEWER']) assert.equal(canManageNews(role), true);
  for (const role of [undefined, null, 'PLAYER', 'REFEREE', 'STREAMER', 'TOURNAMENT_ADMIN']) assert.equal(canManageNews(role), false);
});
