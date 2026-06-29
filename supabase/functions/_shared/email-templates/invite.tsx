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
  Link,
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
  link,
  footer,
} from './_shared-styles.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Du wurdest zu {siteName} eingeladen</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={brandBar}>
          <Text style={brandText}>SHEX DASHBOARD</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Du bist eingeladen</Heading>
          <Text style={text}>
            Du wurdest eingeladen, dem{' '}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>{' '}
            beizutreten. Klicke auf den Button unten, um deinen Zugang zu
            aktivieren.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Einladung annehmen
          </Button>
          <Hr style={{ borderColor: '#2A2410', margin: '32px 0 16px' }} />
          <Text style={footer}>
            Du hast diese Einladung nicht erwartet? Dann ignoriere diese E-Mail.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
