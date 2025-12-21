import { Outlet } from "react-router-dom";
import { MerchantAuthProvider } from "@/hooks/useMerchantAuth";

export default function MerchantRouteRoot() {
  return (
    <MerchantAuthProvider>
      <Outlet />
    </MerchantAuthProvider>
  );
}
