import { Outlet, useLocation } from "react-router-dom";
import { MerchantAuthProvider, MerchantProtectedRoute } from "@/hooks/useMerchantAuth";

export default function MerchantRouteRoot() {
  const location = useLocation();
  
  // Public merchant routes that don't require authentication
  const publicPaths = ['/merchant/login', '/merchant/signup'];
  const isPublicPath = publicPaths.includes(location.pathname);

  return (
    <MerchantAuthProvider>
      {isPublicPath ? (
        <Outlet />
      ) : (
        <MerchantProtectedRoute>
          <Outlet />
        </MerchantProtectedRoute>
      )}
    </MerchantAuthProvider>
  );
}
