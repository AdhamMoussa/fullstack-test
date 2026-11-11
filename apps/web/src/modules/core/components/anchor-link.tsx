import { Anchor, type AnchorProps } from '@mantine/core'
import { createLink, type LinkComponent } from '@tanstack/react-router'
import { forwardRef, type ReactNode } from 'react'

type MantineAnchorProps = Omit<AnchorProps, 'href'> & { children?: ReactNode }

const MantineAnchor = forwardRef<HTMLAnchorElement, MantineAnchorProps>(
  (props, ref) => <Anchor ref={ref} {...props} />,
)

const CreatedAnchorLink = createLink(MantineAnchor)

/** A router-aware Mantine link: typed `to` plus Mantine anchor styling. */
export const AnchorLink: LinkComponent<typeof MantineAnchor> = (props) => (
  <CreatedAnchorLink {...props} />
)
