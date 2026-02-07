export function useAuth() {
  return {
    user: { id: "test", email: "test@test.com", name: "Test User" },
    isAuthenticated: true,
    isLoading: false,
    logout: () => {},
  };
}

export default useAuth;
