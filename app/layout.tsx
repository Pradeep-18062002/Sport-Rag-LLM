import "./global.css";

export const metadata = {
  title: "Sportthon's Sport AI",
  description: "The place where All Sports meet!"
};

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen flex items-center justify-center">
        {children}
      </body>
    </html>
  );
};

export default RootLayout;