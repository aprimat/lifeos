import { Redirect } from 'expo-router';

/** Placeholder for the tab bar's "+" button: pressing it opens the Add sheet instead of this screen. */
export default function AddRoute() {
  return <Redirect href="/today" />;
}
