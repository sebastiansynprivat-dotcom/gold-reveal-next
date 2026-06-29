// Shared inline styles for SHEX Dashboard auth emails.
// Brand: deep black card on white body with gold accents.

export const GOLD = '#C9A646'
export const GOLD_LIGHT = '#E0C275'
export const BLACK = '#0A0A0A'
export const BORDER = '#2A2410'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: 0,
}

export const outerContainer = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 16px',
}

export const brandBar = {
  textAlign: 'center' as const,
  padding: '0 0 20px',
}

export const brandText = {
  color: GOLD,
  fontSize: '14px',
  letterSpacing: '4px',
  fontWeight: 700 as const,
  margin: 0,
}

export const card = {
  backgroundColor: BLACK,
  borderRadius: '14px',
  border: `1px solid ${BORDER}`,
  padding: '40px 32px',
}

export const h1 = {
  color: GOLD,
  fontSize: '24px',
  fontWeight: 700 as const,
  margin: '0 0 20px',
  letterSpacing: '0.2px',
}

export const text = {
  color: '#D4D4D4',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 28px',
}

export const button = {
  backgroundColor: GOLD,
  color: BLACK,
  fontSize: '14px',
  fontWeight: 700 as const,
  letterSpacing: '0.5px',
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const link = {
  color: GOLD_LIGHT,
  textDecoration: 'underline',
}

export const code = {
  display: 'inline-block',
  fontFamily: "'Menlo', 'Courier New', monospace",
  fontSize: '26px',
  fontWeight: 700 as const,
  color: GOLD,
  letterSpacing: '8px',
  backgroundColor: '#000000',
  border: `1px solid ${BORDER}`,
  borderRadius: '10px',
  padding: '16px 24px',
  margin: '0 0 28px',
}

export const footer = {
  color: '#7A7A7A',
  fontSize: '12px',
  lineHeight: '1.6',
  margin: 0,
}

export const footerLink = {
  color: GOLD,
  textDecoration: 'none',
  fontWeight: 600 as const,
}
