export const queryClientInstance = new ({ ... }).default()

// Actually, let me use the proper pattern
import { createClient } from '@tanstack/react-query'

export const queryClientInstance = createClient({
  autoSubscribe: true,
  persistence: 'localStorage',
})