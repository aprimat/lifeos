import { Gallery } from '@/screens/dev/gallery';

/** Development-only design-system gallery. Redirects to Today in production builds. */
export default function DevRoute() {
  return <Gallery />;
}
