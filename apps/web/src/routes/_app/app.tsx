import { createFileRoute } from '@tanstack/react-router'

import { ApplicationPage } from '../../modules/core/pages/application-page'

export const Route = createFileRoute('/_app/app')({
  component: ApplicationPage,
})
