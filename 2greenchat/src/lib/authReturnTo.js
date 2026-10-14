export const safeReturnTo = () => {
  const returnTo = window.location.pathname;
  return returnTo === '/' ? '/' : returnTo;
}