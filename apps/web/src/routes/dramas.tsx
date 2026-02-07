import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dramas")({
  component: DramasLayout,
});

function DramasLayout() {
  return <Outlet />;
}
