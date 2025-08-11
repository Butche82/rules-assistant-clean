// app/layout.tsx
export const metadata = { title: "Rules Assistant", description: "Board game rules chat with citations." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>{children}</body></html>);

  import "./globals.css";
}
