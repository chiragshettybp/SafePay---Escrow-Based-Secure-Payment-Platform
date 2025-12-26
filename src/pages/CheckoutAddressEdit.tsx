import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Seo } from '@/components/seo/Seo';

export default function CheckoutAddressEdit() {
  const { session_id } = useParams<{ session_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Load existing address from session
  useEffect(() => {
    const loadSession = async () => {
      if (!session_id) return;

      const { data: session } = await supabase
        .from('checkout_sessions')
        .select('shipping_name, shipping_address, shipping_pincode, phone_number')
        .eq('id', session_id)
        .single();

      if (session) {
        const addr = session.shipping_address as Record<string, string> | null;
        setForm({
          full_name: session.shipping_name || '',
          phone: session.phone_number || '',
          address_line1: addr?.address_line1 || '',
          address_line2: addr?.address_line2 || '',
          city: addr?.city || '',
          state: addr?.state || '',
          pincode: session.shipping_pincode || addr?.pincode || '',
        });
      }
    };

    loadSession();
  }, [session_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.full_name || !form.phone || !form.address_line1 || !form.city || !form.state || !form.pincode) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    if (form.pincode.length !== 6) {
      toast({ title: 'Invalid pincode', description: 'Please enter a valid 6-digit pincode', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      // Check pincode serviceability
      const { data: pincodeData } = await supabase
        .from('pincode_serviceability')
        .select('*')
        .eq('pincode', form.pincode)
        .maybeSingle();

      const isServiceable = pincodeData?.is_serviceable ?? true;
      const codAvailable = pincodeData?.cod_available ?? true;
      const deliveryMin = pincodeData?.delivery_days_min ?? 3;
      const deliveryMax = pincodeData?.delivery_days_max ?? 7;

      if (pincodeData && !isServiceable) {
        toast({ title: 'Not serviceable', description: 'Delivery not available to this pincode', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const shippingAddress = {
        address_line1: form.address_line1,
        address_line2: form.address_line2,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: 'India',
      };

      const deliveryEstimate = `${deliveryMin}-${deliveryMax} business days`;

      // Update session
      const { error } = await supabase
        .from('checkout_sessions')
        .update({
          shipping_name: form.full_name,
          shipping_address: JSON.parse(JSON.stringify(shippingAddress)),
          shipping_pincode: form.pincode,
          delivery_estimate: deliveryEstimate,
          cod_available: codAvailable,
          current_step: 'payment',
        })
        .eq('id', session_id);

      if (error) throw error;

      toast({ title: 'Address updated', description: 'Proceeding to payment' });
      navigate(`/checkout/${session_id}`);
    } catch (error) {
      console.error('Error updating address:', error);
      toast({ title: 'Error', description: 'Failed to update address', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Edit Address" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/checkout/${session_id}`)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">Edit Delivery Address</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Address</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1 *</Label>
                <Input
                  id="address_line1"
                  value={form.address_line1}
                  onChange={(e) => setForm(prev => ({ ...prev, address_line1: e.target.value }))}
                  placeholder="House/Flat No., Building Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={form.address_line2}
                  onChange={(e) => setForm(prev => ({ ...prev, address_line2: e.target.value }))}
                  placeholder="Street, Landmark"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    value={form.pincode}
                    onChange={(e) => setForm(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    placeholder="6-digit"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(`/checkout/${session_id}`)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save & Continue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}