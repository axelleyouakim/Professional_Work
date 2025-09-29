import './styles/globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="ember-application">
        {children}
      </body>
    </html>
  );
}