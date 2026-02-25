import { Link, useRouterState, useLocation } from "@tanstack/react-router";
import { LogIn, LogOut, UserCircle, Bookmark, Heart } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/use-auth";
import { SearchIcon } from "./search-icon";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const userLabel = user?.name?.trim() || user?.email?.trim() || "Account";
  const signInSearch = { redirect: currentPath };
  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    try {
      setIsSigningOut(true);
      await logout();
      setIsProfileMenuOpen(false);
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

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <SearchIcon />
            {!isLoading && (
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="p-2 text-gray-400 hover:text-primary transition-colors transition-all"
                      style={{ borderRadius: "0" }}
                      aria-label="Profile menu"
                    >
                      <UserCircle className="w-5 h-5" />
                    </button>
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#0A0A0A] border border-primary/30 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 border-b border-primary/20">
                          <p className="text-sm font-medium text-gray-400 truncate">
                            {userLabel}
                          </p>
                        </div>
                        <div className="py-1">
                          <Link
                            to="/profile/watchlist"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-primary transition-colors hover:bg-primary/10 transition-colors"
                          >
                            <Bookmark className="w-4 h-4" />
                            My Watchlist
                          </Link>
                          <Link
                            to="/profile/favorites"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-primary transition-colors hover:bg-primary/10 transition-colors"
                          >
                            <Heart className="w-4 h-4" />
                            My Favorites
                          </Link>
                          <button
                            type="button"
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-primary transition-colors hover:bg-primary/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            {isSigningOut ? "Signing Out..." : "Sign Out"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/auth/signin"
                    search={signInSearch}
                    className="p-2 text-gray-400 hover:text-primary transition-colors transition-all"
                    style={{ borderRadius: "0" }}
                    aria-label="Sign In"
                  >
                    <LogIn className="w-5 h-5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
