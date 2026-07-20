'use client';

import "./../globals.css";
import { usePathname } from 'next/navigation';
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export default function PagesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <div className="min-h-screen bg-[#07070c] text-white">
      <Navbar/>
      {children}
      <Footer/>
    </div>
  );
}
