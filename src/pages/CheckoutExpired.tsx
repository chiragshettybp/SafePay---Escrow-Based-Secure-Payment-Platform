import { useParams, useNavigate } from 'react-router-dom';
import { Clock, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';

export default function CheckoutExpired() {
  const { session_id } = useParams<{ session_id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Seo title="Session Expired" />
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Checkout Session Expired</h2>
          <p className="text-muted-foreground mb-6">
            Your checkout session has timed out for security reasons. 
            Please start a new checkout to complete your purchase.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/')} className="gap-2">
              <Home className="h-4 w-4" />
              Return to Home
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
          {session_id && (
            <p className="text-xs text-muted-foreground mt-6">
              Session ID: {session_id.slice(0, 8)}...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}