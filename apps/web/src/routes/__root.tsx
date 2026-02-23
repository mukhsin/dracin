import {
  Outlet,
  createRootRoute,
  HeadContent,
  useLocation,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import styles from "../styles.css?url";
import { Header } from "../components/header.js";
import { ThemeProvider } from "../contexts/theme-context.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dracin - Stream Your Favorite Dramas" },
    ],
    links: [{ rel: "stylesheet", href: styles }],
  }),
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HeadContent />
        <div className="min-h-screen bg-background">
          {!isAuthPage && <Header />}
          <main className={isAuthPage ? "" : "pt-16"}>
            <Outlet />
          </main>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
