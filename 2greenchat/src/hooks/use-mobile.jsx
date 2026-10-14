export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  // ... mobile detect logic
  return isMobile;
}

export function useSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  // ... size logic
  return size;
}