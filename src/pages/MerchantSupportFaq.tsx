import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMerchantSupport } from "@/hooks/useMerchantSupport";
import { ArrowLeft, Search, HelpCircle, Package, Wallet, AlertTriangle, Shield, Settings, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "orders": Package,
  "orders_shipments": Package,
  "payments": Wallet,
  "payments_payouts": Wallet,
  "disputes": AlertTriangle,
  "verification": Shield,
  "verification_kyc": Shield,
  "account": Settings,
  "account_login": Settings,
  "platform": HelpCircle,
  "general": HelpCircle,
};

const MerchantSupportFaq = () => {
  const navigate = useNavigate();
  const { faqs, faqsLoading } = useMerchantSupport();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = useMemo(() => {
    if (!faqs) return [];
    const cats = [...new Set(faqs.map((faq) => faq.category))];
    return cats;
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    if (!faqs) return [];
    return faqs.filter((faq) => {
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [faqs, searchQuery, activeCategory]);

  const groupedFaqs = useMemo(() => {
    const groups: Record<string, typeof filteredFaqs> = {};
    filteredFaqs.forEach((faq) => {
      if (!groups[faq.category]) {
        groups[faq.category] = [];
      }
      groups[faq.category].push(faq);
    });
    return groups;
  }, [filteredFaqs]);

  const getCategoryIcon = (category: string) => {
    const key = Object.keys(CATEGORY_ICONS).find((k) => 
      category.toLowerCase().includes(k)
    );
    return CATEGORY_ICONS[key || "general"] || HelpCircle;
  };

  const formatCategoryName = (category: string) => {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" & ");
  };

  if (faqsLoading) {
    return (
      <MerchantLayout>
        <div className="container max-w-4xl px-4 sm:px-6 py-4 sm:py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-12 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="container max-w-4xl px-4 sm:px-6 py-4 sm:py-6">
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => navigate("/merchant/support")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Support
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Help Center</h1>
          <p className="text-muted-foreground mt-1">
            Find answers to frequently asked questions
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList className="w-full flex-wrap h-auto gap-2 bg-transparent p-0">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              All
            </TabsTrigger>
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat);
              return (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4 mr-1 hidden sm:inline" />
                  {formatCategoryName(cat)}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* FAQs */}
        {filteredFaqs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No results found</p>
              <p className="text-muted-foreground text-center mb-4">
                We couldn't find any FAQs matching your search.
              </p>
              <Button onClick={() => navigate("/merchant/support/create")}>
                <Plus className="h-4 w-4 mr-2" />
                Ask a Question
              </Button>
            </CardContent>
          </Card>
        ) : activeCategory === "all" ? (
          // Grouped view
          <div className="space-y-6">
            {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => {
              const Icon = getCategoryIcon(category);
              return (
                <Card key={category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-5 w-5" />
                      {formatCategoryName(category)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {categoryFaqs.map((faq) => (
                        <AccordionItem key={faq.id} value={faq.id}>
                          <AccordionTrigger className="text-left">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          // Single category view
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Still need help */}
        <Card className="mt-8">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
            <div className="text-center sm:text-left">
              <h3 className="font-semibold mb-1">Still need help?</h3>
              <p className="text-sm text-muted-foreground">
                Can't find what you're looking for? Create a support ticket.
              </p>
            </div>
            <Button onClick={() => navigate("/merchant/support/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
};

export default MerchantSupportFaq;
