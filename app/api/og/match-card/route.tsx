import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);

    // Extract query params
    const teamAName = searchParams.get('teamA') || 'TEAM ALFA';
    const teamBName = searchParams.get('teamB') || 'TEAM BETA';
    const teamATag = searchParams.get('tagA') || 'ALFA';
    const teamBTag = searchParams.get('tagB') || 'BETA';
    const logoA = searchParams.get('logoA') || '';
    const logoB = searchParams.get('logoB') || '';
    const dateStr = searchParams.get('date') || 'TODAY';
    const timeStr = searchParams.get('time') || '20:00 GMT';
    const stage = searchParams.get('stage') || 'GROUP STAGE';
    const lobby = searchParams.get('lobby') || 'LOBBY A';
    
    // Theme customization
    const colorA = searchParams.get('colorA') || '#e8740a'; // Orange/Gold
    const colorB = searchParams.get('colorB') || '#3b82f6'; // Blue
    const bgUrl = searchParams.get('bg') || ''; // Optional custom bg image

    // Helper to resolve absolute URLs for images (Next.js OG fails on relative paths)
    const getAbsoluteLogo = (logo: string, baseOrigin: string) => {
      if (!logo) return 'https://botsville.gg/mlbb_logo.png';
      if (logo.startsWith('http://') || logo.startsWith('https://')) return logo;
      const cleanPath = logo.startsWith('/') ? logo : `/${logo}`;
      return `${baseOrigin}${cleanPath}`;
    };

    const defaultLogoA = getAbsoluteLogo(logoA, origin);
    const defaultLogoB = getAbsoluteLogo(logoB, origin);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#04050a',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
            padding: '40px',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Ambient Background Grid & Glows */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              background: 'radial-gradient(circle at 20% 50%, rgba(232, 116, 10, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
              opacity: 0.8,
            }}
          />
          
          {/* Tech Grid Pattern */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Golden Horizontal Divider Lines */}
          <div
            style={{
              position: 'absolute',
              top: '35px',
              left: '5%',
              right: '5%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(232, 160, 0, 0.3) 50%, transparent)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '35px',
              left: '5%',
              right: '5%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1) 50%, transparent)',
            }}
          />

          {/* ── HEADER SECTION ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <div
              style={{
                background: 'rgba(232, 160, 0, 0.12)',
                border: '1px solid rgba(232, 160, 0, 0.3)',
                color: '#e8a000',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '6px 20px',
                borderRadius: '4px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              Botsville Championship
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '14px',
                marginTop: '10px',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {stage} • {lobby}
            </div>
          </div>

          {/* ── CENTRAL MATCHUP ROW ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0 80px',
              zIndex: 10,
              flex: 1,
            }}
          >
            {/* Team A (Left) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                textAlign: 'center',
              }}
            >
              {/* Logo Frame */}
              <div
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: `2px solid ${colorA}`,
                  boxShadow: `0 0 30px ${colorA}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: '12px',
                  marginBottom: '20px',
                }}
              >
                <img
                  src={defaultLogoA}
                  alt={teamAName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
              <div
                style={{
                  color: '#ffffff',
                  fontSize: '28px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {teamAName}
              </div>
              <div
                style={{
                  color: colorA,
                  fontSize: '16px',
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  marginTop: '5px',
                }}
              >
                [{teamATag}]
              </div>
            </div>

            {/* VS Graphic in Center */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 40px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '72px',
                  fontWeight: 950,
                  fontStyle: 'italic',
                  position: 'relative',
                }}
              >
                <span style={{ color: colorA, textShadow: `0 0 25px ${colorA}aa`, marginRight: '-5px' }}>V</span>
                <span style={{ color: colorB, textShadow: `0 0 25px ${colorB}aa` }}>S</span>
              </div>
              
              <div
                style={{
                  width: '40px',
                  height: '2px',
                  background: 'rgba(255,255,255,0.1)',
                  margin: '10px 0',
                }}
              />
            </div>

            {/* Team B (Right) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                textAlign: 'center',
              }}
            >
              {/* Logo Frame */}
              <div
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: `2px solid ${colorB}`,
                  boxShadow: `0 0 30px ${colorB}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: '12px',
                  marginBottom: '20px',
                }}
              >
                <img
                  src={defaultLogoB}
                  alt={teamBName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
              <div
                style={{
                  color: '#ffffff',
                  fontSize: '28px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {teamBName}
              </div>
              <div
                style={{
                  color: colorB,
                  fontSize: '16px',
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  marginTop: '5px',
                }}
              >
                [{teamBTag}]
              </div>
            </div>
          </div>

          {/* ── FOOTER SCHEDULE SECTION ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <div
              style={{
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              {timeStr}
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.3)',
                fontSize: '13px',
                marginTop: '5px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {dateStr}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}
