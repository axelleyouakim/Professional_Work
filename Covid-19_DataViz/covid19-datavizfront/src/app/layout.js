import './styles/globals.css';
import QueryProvider from './providers/QueryProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="ember-application">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}