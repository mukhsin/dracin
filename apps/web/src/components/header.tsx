import { Link, useRouterState, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { SearchIcon } from "./search-icon";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const routerState = useRouterState();
  const location = useLocation();
  const currentPath = routerState.location.pathname;
  const { user, isAuthenticated, isLoading, logout } = useAuth();

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

  const userLabel = user?.name?.trim() || user?.email?.trim() || "Account";

  const handleSignOut = async () => {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      await logout();
      setIsMobileMenuOpen(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#0A0A0A]/95 backdrop-blur-md border-b border-primary/20"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-bold text-xl hidden sm:block group-hover:scale-105 transition-transform">
              <span className="text-primary">Dra</span>
              <span className="text-white">Syn</span>
            </span>
            <span className="font-bold text-xl sm:hidden group-hover:scale-105 transition-transform">
              <span className="text-primary">Dra</span>
              <span className="text-white">Syn</span>
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
                      ? "text-primary border-b-2 border-primary"
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
            {!isLoading && (
              <div className="hidden md:flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <span className="max-w-40 truncate px-3 py-2 text-xs font-medium tracking-wider uppercase text-gray-300 border border-primary/20 bg-black/20">
                      {userLabel}
                    </span>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="px-4 py-2 text-sm font-medium tracking-wider uppercase text-gray-300 hover:text-white border border-primary/30 hover:border-primary/60 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ borderRadius: "0" }}
                    >
                      {isSigningOut ? "Signing Out..." : "Sign Out"}
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth/signin"
                    className="px-4 py-2 text-sm font-medium tracking-wider uppercase text-gray-300 hover:text-white border border-primary/30 hover:border-primary/60 transition-all"
                    style={{ borderRadius: "0" }}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}
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
          <div className="md:hidden bg-[#0A0A0A]/95 backdrop-blur-md border-t border-primary/20">
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
                        ? "text-primary border-l-2 border-primary"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {!isLoading && (
                <div className="mt-2 border-t border-primary/20 pt-2">
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-3 text-xs font-medium tracking-wider uppercase text-gray-400">
                        {userLabel}
                      </div>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="w-full text-left px-4 py-3 text-sm font-medium tracking-wider uppercase text-gray-400 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSigningOut ? "Signing Out..." : "Sign Out"}
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth/signin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-medium tracking-wider uppercase text-gray-400 hover:text-white transition-colors"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
