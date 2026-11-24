# News content

Sync schema changes with `npx prisma db push`, then run `npx prisma generate`.
The project uses this workflow rather than migration scripts.

The existing `news` table supports three explicit formats:

- `ARTICLE`: a news story or interview; body text is required to publish.
- `QUICK_POST`: a short update, hot take, or banter; text-only posts are supported.
- `MEME`: an image or GIF with optional caption/context; media is required to publish.

Format is separate from topic. Topics include Community, Esports, Banter, Patch notes,
Events, Heroes, and Interviews. Optional `sourceName` and `sourceUrl` store creator
credits or the original source. Tags and the existing cover/gallery fields are retained.

Existing rows receive the database default `ARTICLE`. Their content, IDs, URLs,
publication dates, and reactions are retained. Choose Meme or Quick post in the editor
to reclassify older posts. New posts save the explicitly selected format, independent
of body length. Drafts can be incomplete. Interviewers can publish only news stories
in the Interviews topic.

The API supports `format=ARTICLE`, `format=QUICK_POST`, `format=MEME`, and legacy
`format=posts` (quick posts plus memes), optionally combined with `category`.
Filtering and pagination counts are performed in the database. Public pages and
share metadata exclude drafts and deleted posts. Supporting indexes cover topic
and format filters.
