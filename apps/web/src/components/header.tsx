import { Link, useRouterState, useLocation } from "@tanstack/react-router";
import { Film, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { SearchIcon } from "./search-icon";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const routerState = useRouterState();
  const location = useLocation();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/dramas", label: "Browse" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#C9A962]/20"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 bg-[#C9A962] flex items-center justify-center group-hover:scale-105 transition-transform"
              style={{ borderRadius: "0" }}
            >
              <Film className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-lg hidden sm:block text-white">
              Dracin
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  state={location.state}
                  className={`px-4 py-2 text-sm font-medium tracking-wider uppercase transition-all ${
                    active
                      ? "text-[#C9A962] border-b-2 border-[#C9A962]"
                      : "text-gray-400 hover:text-white"
                  }`}
                  style={{ borderRadius: "0" }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <SearchIcon />
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-all"
              style={{ borderRadius: "0" }}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#0A0A0A]/95 backdrop-blur-md border-t border-[#C9A962]/20">
            <nav className="flex flex-col py-4">
              {navLinks.map((link) => {
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    state={location.state}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-4 py-3 text-sm font-medium tracking-wider uppercase transition-colors ${
                      active
                        ? "text-[#C9A962] border-l-2 border-[#C9A962]"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
