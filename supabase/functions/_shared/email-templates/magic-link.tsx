/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import {
  main,
  outerContainer,
  card,
  brandBar,
  brandText,
  h1,
  text,
  button,
  footer,
} from './_shared-styles.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Login-Link für {siteName}</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={brandBar}>
          <Text style={brandText}>SHEX DASHBOARD</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Dein Login-Link</Heading>
          <Text style={text}>
            Klicke auf den Button unten, um dich einzuloggen. Der Link läuft
            aus Sicherheitsgründen in Kürze ab.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Jetzt einloggen
          </Button>
          <Hr style={{ borderColor: '#2A2410', margin: '32px 0 16px' }} />
          <Text style={footer}>
            Du hast diesen Link nicht angefordert? Dann ignoriere diese E-Mail.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
