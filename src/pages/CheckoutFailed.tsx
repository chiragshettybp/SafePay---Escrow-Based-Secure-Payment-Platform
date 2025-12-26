import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, RefreshCw, Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';

export default function CheckoutFailed() {
  const { session_id } = useParams<{ session_id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const reason = searchParams.get('reason') || 'Payment could not be processed';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Seo title="Checkout Failed" />
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Checkout Failed</h2>
          <p className="text-muted-foreground mb-6">
            {reason}
          </p>
          <div className="flex flex-col gap-2">
            {session_id && (
              <Button onClick={() => navigate(`/checkout/${session_id}`)} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
              <Home className="h-4 w-4" />
              Return to Home
            </Button>
            <Button variant="ghost" onClick={() => navigate('/support')} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Contact Support
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