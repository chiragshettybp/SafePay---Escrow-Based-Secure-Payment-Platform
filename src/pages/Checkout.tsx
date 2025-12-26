import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MapPin, CreditCard, CheckCircle, ChevronLeft, Clock, Shield, Truck, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useCheckout, CheckoutStep, PaymentMethod, CustomerAddress } from '@/hooks/useCheckout';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Seo } from '@/components/seo/Seo';

// Step indicator component
const StepIndicator = ({ 
  step, 
  currentStep, 
  completedSteps,
  label,
  icon: Icon 
}: { 
  step: CheckoutStep; 
  currentStep: CheckoutStep;
  completedSteps: CheckoutStep[];
  label: string;
  icon: React.ElementType;
}) => {
  const stepOrder: CheckoutStep[] = ['login', 'address', 'payment', 'confirmation'];
  const currentIndex = stepOrder.indexOf(currentStep);
  const stepIndex = stepOrder.indexOf(step);
  const isCompleted = completedSteps.includes(step);
  const isActive = step === currentStep;
  const isPending = stepIndex > currentIndex;

  return (
    <div className="flex items-center gap-2">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
        ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
        ${isActive ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' : ''}
        ${isPending ? 'bg-muted text-muted-foreground' : ''}
      `}>
        {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <span className={`text-sm hidden sm:block ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
};

// Session timer component
const SessionTimer = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (timeLeft <= 0) return null;

  return (
    <div className={`flex items-center gap-1 text-sm ${timeLeft < 300 ? 'text-destructive' : 'text-muted-foreground'}`}>
      <Clock className="h-4 w-4" />
      <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
    </div>
  );
};

export default function Checkout() {
  const { session_id } = useParams<{ session_id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form states
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Address form
  const [addressForm, setAddressForm] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    save_address: true,
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Payment
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);

  const {
    session,
    addresses,
    isLoading,
    isExpired,
    error,
    collectPhone,
    updateAddress,
    selectPaymentMethod,
    completeCheckout,
    goToStep,
    refetchSession,
  } = useCheckout({ sessionId: session_id });

  // Determine completed steps
  const getCompletedSteps = (): CheckoutStep[] => {
    if (!session) return [];
    const completed: CheckoutStep[] = [];
    if (session.phone_collected) completed.push('login');
    if (session.shipping_address) completed.push('address');
    if (session.selected_payment_method) completed.push('payment');
    if (session.status === 'completed') completed.push('confirmation');
    return completed;
  };

  // Pre-fill address if user has saved addresses
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find(a => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddress.id);
      setAddressForm({
        full_name: defaultAddress.full_name,
        phone: defaultAddress.phone,
        address_line1: defaultAddress.address_line1,
        address_line2: defaultAddress.address_line2 || '',
        city: defaultAddress.city,
        state: defaultAddress.state,
        pincode: defaultAddress.pincode,
        save_address: false,
      });
    }
  }, [addresses, selectedAddressId]);

  // Pre-fill phone from session
  useEffect(() => {
    if (session?.phone_number && !phoneNumber) {
      setPhoneNumber(session.phone_number.replace('+91', ''));
    }
  }, [session?.phone_number, phoneNumber]);

  // Handle phone number collection and continue
  const handlePhoneContinue = async () => {
    if (phoneNumber.length !== 10) {
      toast({ title: 'Invalid phone number', description: 'Please enter a valid 10-digit phone number', variant: 'destructive' });
      return;
    }
    
    await collectPhone.mutateAsync(`+91${phoneNumber}`);
  };

  // Handle address submit
  const handleAddressSubmit = async () => {
    if (!addressForm.full_name || !addressForm.phone || !addressForm.address_line1 || 
        !addressForm.city || !addressForm.state || !addressForm.pincode) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    
    if (addressForm.pincode.length !== 6) {
      toast({ title: 'Invalid pincode', description: 'Please enter a valid 6-digit pincode', variant: 'destructive' });
      return;
    }

    await updateAddress.mutateAsync(addressForm);
  };

  // Handle payment selection
  const handlePaymentSelect = async (method: PaymentMethod) => {
    setSelectedPayment(method);
    await selectPaymentMethod.mutateAsync(method);
  };

  // Handle checkout complete
  const handleCompleteCheckout = async () => {
    if (!selectedPayment) {
      toast({ title: 'Select payment', description: 'Please select a payment method', variant: 'destructive' });
      return;
    }

    if (selectedPayment === 'cod') {
      await completeCheckout.mutateAsync({});
    } else {
      // For online payments, redirect to payment page
      if (session?.order_id) {
        navigate(`/payment/pay/${session.order_id}`);
      } else {
        // Create order first, then redirect
        const result = await completeCheckout.mutateAsync({});
        if (result?.order_id) {
          navigate(`/payment/pay/${result.order_id}`);
        }
      }
    }
  };

  // Select saved address
  const handleSelectAddress = (address: CustomerAddress) => {
    setSelectedAddressId(address.id);
    setAddressForm({
      full_name: address.full_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      save_address: false,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Clock className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Checkout Unavailable</h2>
            <p className="text-muted-foreground mb-6">
              Unable to load checkout session. Please try again.
            </p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No session or expired
  if (!session || isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Session Expired</h2>
            <p className="text-muted-foreground mb-6">
              Your checkout session has expired. Please start a new checkout.
            </p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed state
  if (session.status === 'completed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Seo title="Order Confirmed" />
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Order Placed Successfully!</h2>
            <p className="text-muted-foreground mb-2">
              Thank you for your order.
            </p>
            {session.order_id && (
              <p className="text-sm text-muted-foreground mb-6">
                Order ID: <span className="font-mono">{session.order_id.slice(0, 8).toUpperCase()}</span>
              </p>
            )}
            <div className="flex flex-col gap-2">
              {session.order_id && (
                <Button onClick={() => navigate(`/order/${session.order_id}`)}>View Order</Button>
              )}
              <Button variant="outline" onClick={() => navigate('/')}>Continue Shopping</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedSteps = getCompletedSteps();
  const currentStep = session.current_step;

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Checkout" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              {session.merchants?.logo_url ? (
                <img src={session.merchants.logo_url} alt="" className="h-8 w-8 rounded" />
              ) : (
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-sm">
                    {session.merchants?.business_name?.[0] || 'S'}
                  </span>
                </div>
              )}
              <span className="font-medium hidden sm:block">{session.merchants?.business_name || 'Checkout'}</span>
            </div>
            <SessionTimer expiresAt={session.expires_at} />
          </div>
        </div>
      </header>

      {/* Step Indicators */}
      <div className="border-b bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <StepIndicator step="login" currentStep={currentStep} completedSteps={completedSteps} label="Login" icon={Phone} />
            <div className="flex-1 h-px bg-border mx-2" />
            <StepIndicator step="address" currentStep={currentStep} completedSteps={completedSteps} label="Address" icon={MapPin} />
            <div className="flex-1 h-px bg-border mx-2" />
            <StepIndicator step="payment" currentStep={currentStep} completedSteps={completedSteps} label="Payment" icon={CreditCard} />
            <div className="flex-1 h-px bg-border mx-2" />
            <StepIndicator step="confirmation" currentStep={currentStep} completedSteps={completedSteps} label="Done" icon={CheckCircle} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Steps */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="wait">
              {/* Step 1: Phone Collection (No OTP) */}
              {currentStep === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Enter Phone Number
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number</Label>
                        <div className="flex gap-2">
                          <div className="flex items-center px-3 bg-muted rounded-md border">
                            <span className="text-sm">+91</span>
                          </div>
                          <Input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            placeholder="Enter 10-digit number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="flex-1"
                            maxLength={10}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Enter your phone number to continue
                        </p>
                      </div>
                      <Button 
                        className="w-full gap-2" 
                        onClick={handlePhoneContinue}
                        disabled={phoneNumber.length !== 10 || collectPhone.isPending}
                      >
                        {collectPhone.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        Continue
                      </Button>
                      
                      {/* Security note */}
                      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                        <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          Your phone number is used for order updates and support. We use industry-standard encryption.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 2: Address */}
              {currentStep === 'address' && (
                <motion.div
                  key="address"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Delivery Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Saved Addresses */}
                      {addresses.length > 0 && (
                        <div className="space-y-2">
                          <Label>Saved Addresses</Label>
                          <RadioGroup value={selectedAddressId || ''} onValueChange={(id) => {
                            const addr = addresses.find(a => a.id === id);
                            if (addr) handleSelectAddress(addr);
                          }}>
                            {addresses.map((addr) => (
                              <div key={addr.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                <RadioGroupItem value={addr.id} id={addr.id} className="mt-1" />
                                <label htmlFor={addr.id} className="flex-1 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{addr.full_name}</span>
                                    <Badge variant="secondary" className="text-xs">{addr.label}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {addr.address_line1}, {addr.city}, {addr.state} - {addr.pincode}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{addr.phone}</p>
                                </label>
                              </div>
                            ))}
                          </RadioGroup>
                          <Separator className="my-4" />
                          <p className="text-sm text-muted-foreground text-center">Or add a new address</p>
                        </div>
                      )}

                      {/* Address Form */}
                      <div className="grid gap-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="full_name">Full Name *</Label>
                            <Input
                              id="full_name"
                              value={addressForm.full_name}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, full_name: e.target.value }))}
                              placeholder="Enter full name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="addr_phone">Phone *</Label>
                            <Input
                              id="addr_phone"
                              type="tel"
                              value={addressForm.phone}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="+91 XXXXXXXXXX"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address_line1">Address Line 1 *</Label>
                          <Input
                            id="address_line1"
                            value={addressForm.address_line1}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, address_line1: e.target.value }))}
                            placeholder="House/Flat No., Building Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address_line2">Address Line 2</Label>
                          <Input
                            id="address_line2"
                            value={addressForm.address_line2}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, address_line2: e.target.value }))}
                            placeholder="Street, Landmark"
                          />
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city">City *</Label>
                            <Input
                              id="city"
                              value={addressForm.city}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                              placeholder="City"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state">State *</Label>
                            <Input
                              id="state"
                              value={addressForm.state}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                              placeholder="State"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pincode">Pincode *</Label>
                            <Input
                              id="pincode"
                              value={addressForm.pincode}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                              placeholder="6-digit"
                              maxLength={6}
                            />
                          </div>
                        </div>
                        {!selectedAddressId && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="save_address"
                              checked={addressForm.save_address}
                              onCheckedChange={(checked) => setAddressForm(prev => ({ ...prev, save_address: !!checked }))}
                            />
                            <Label htmlFor="save_address" className="text-sm cursor-pointer">
                              Save this address for future orders
                            </Label>
                          </div>
                        )}
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={handleAddressSubmit}
                        disabled={updateAddress.isPending}
                      >
                        {updateAddress.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Continue to Payment
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Delivery Info */}
                      {session.shipping_address && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{session.shipping_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(session.shipping_address as any).address_line1}, {(session.shipping_address as any).city}
                              </p>
                              <p className="text-sm text-muted-foreground">{session.shipping_pincode}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => goToStep('address')}>
                              Change
                            </Button>
                          </div>
                          {session.delivery_estimate && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                              <Truck className="h-4 w-4" />
                              <span>Delivery in {session.delivery_estimate}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <Separator />

                      {/* Payment Methods */}
                      <RadioGroup 
                        value={selectedPayment || ''} 
                        onValueChange={(v) => handlePaymentSelect(v as PaymentMethod)}
                      >
                        <div className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedPayment === 'upi' ? 'border-primary bg-primary/5' : ''}`}>
                          <RadioGroupItem value="upi" id="upi" />
                          <label htmlFor="upi" className="flex-1 cursor-pointer">
                            <span className="font-medium">UPI</span>
                            <p className="text-sm text-muted-foreground">Pay using UPI apps like GPay, PhonePe, Paytm</p>
                          </label>
                        </div>

                        <div className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedPayment === 'card' ? 'border-primary bg-primary/5' : ''}`}>
                          <RadioGroupItem value="card" id="card" />
                          <label htmlFor="card" className="flex-1 cursor-pointer">
                            <span className="font-medium">Credit / Debit Card</span>
                            <p className="text-sm text-muted-foreground">Visa, Mastercard, RuPay</p>
                          </label>
                        </div>

                        <div className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedPayment === 'netbanking' ? 'border-primary bg-primary/5' : ''}`}>
                          <RadioGroupItem value="netbanking" id="netbanking" />
                          <label htmlFor="netbanking" className="flex-1 cursor-pointer">
                            <span className="font-medium">Net Banking</span>
                            <p className="text-sm text-muted-foreground">All major banks supported</p>
                          </label>
                        </div>

                        {session.cod_available && (
                          <div className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedPayment === 'cod' ? 'border-primary bg-primary/5' : ''}`}>
                            <RadioGroupItem value="cod" id="cod" />
                            <label htmlFor="cod" className="flex-1 cursor-pointer">
                              <span className="font-medium">Cash on Delivery</span>
                              <p className="text-sm text-muted-foreground">Pay when you receive</p>
                            </label>
                          </div>
                        )}
                      </RadioGroup>

                      <Button 
                        className="w-full" 
                        onClick={handleCompleteCheckout}
                        disabled={!selectedPayment || completeCheckout.isPending || selectPaymentMethod.isPending}
                      >
                        {(completeCheckout.isPending || selectPaymentMethod.isPending) ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {selectedPayment === 'cod' ? 'Place Order' : `Pay ${formatCurrency(session.final_amount)}`}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {(Array.isArray(session.cart_data) ? session.cart_data : []).map((item, index) => (
                    <div key={index} className="flex gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={`${item.product_name} product image`}
                          className="w-12 h-12 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">IMG</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(session.cart_total)}</span>
                  </div>
                  {session.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(session.discount_amount)}</span>
                    </div>
                  )}
                  {session.shipping_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{formatCurrency(session.shipping_amount)}</span>
                    </div>
                  )}
                  {session.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(session.tax_amount)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(session.final_amount)}</span>
                </div>

                {/* Trust Badges */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>100% Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    <span>Free Returns within 7 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{formatCurrency(session.final_amount)}</p>
          </div>
          {currentStep === 'payment' && (
            <Button 
              className="flex-1"
              onClick={handleCompleteCheckout}
              disabled={!selectedPayment || completeCheckout.isPending}
            >
              {completeCheckout.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedPayment === 'cod' ? 'Place Order' : 'Pay Now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}