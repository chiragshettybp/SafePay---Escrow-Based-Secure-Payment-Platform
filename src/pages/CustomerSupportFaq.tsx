import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  Search,
  ShoppingBag,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  User,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { useCustomerSupport } from "@/hooks/useCustomerSupport";

const CustomerSupportFaq = () => {
  const navigate = useNavigate();
  const { faqs, faqsLoading } = useCustomerSupport();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categoryIcons: Record<string, React.ElementType> = {
    Orders: ShoppingBag,
    Payments: CreditCard,
    Refunds: RefreshCw,
    Disputes: AlertTriangle,
    Account: User,
  };

  const categories = useMemo(() => {
    if (!faqs) return [];
    const uniqueCategories = [...new Set(faqs.map((faq) => faq.category))];
    return uniqueCategories;
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    if (!faqs) return [];

    return faqs.filter((faq) => {
      const matchesSearch =
        searchQuery === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === "all" || faq.category === activeCategory;

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

  if (faqsLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-4xl px-4 sm:px-6 py-4 sm:py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/support")}
            className="mb-4 -ml-2"
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
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
            <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
              >
                All
              </TabsTrigger>
              {categories.map((category) => {
                const Icon = categoryIcons[category] || HelpCircle;
                return (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {category}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* FAQs */}
          {filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  Try a different search term or browse all categories
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          ) : activeCategory === "all" ? (
            // Show grouped by category
            <div className="space-y-6">
              {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => {
                const Icon = categoryIcons[category] || HelpCircle;
                return (
                  <Card key={category}>
                    <CardHeader className="p-4 sm:p-6 pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5 text-primary" />
                        {category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-2">
                      <Accordion type="single" collapsible>
                        {categoryFaqs.map((faq) => (
                          <AccordionItem key={faq.id} value={faq.id}>
                            <AccordionTrigger className="text-left text-sm sm:text-base">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
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
            // Show single category
            <Card>
              <CardContent className="p-4 sm:p-6">
                <Accordion type="single" collapsible>
                  {filteredFaqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left text-sm sm:text-base">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Still Need Help */}
          <Card className="mt-6 border-primary/50 bg-primary/5">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="p-3 rounded-full bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Still need help?</h3>
                  <p className="text-sm text-muted-foreground">
                    Can't find what you're looking for? Create a support ticket.
                  </p>
                </div>
                <Button onClick={() => navigate("/support/create")}>
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerSupportFaq;
