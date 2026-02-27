'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { CheckCircle, Bell } from "lucide-react";
import { format } from "date-fns";
import type { Subscription, Plan } from "@/lib/schema";
import { getUserSubscription, activateSubscription } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const packages: Plan[] = [
  { name: "Starter", price: "₹2,499/mo", features: ["Basic Analytics", "Copy 5 Traders", "Community Access"] },
  { name: "Pro", price: "₹6,599/mo", features: ["Advanced Analytics", "Copy 20 Traders", "Priority Support", "Webinars"] },
  { name: "Expert", price: "₹12,499/mo", features: ["Pro Features+", "API Access", "Dedicated Manager", "Exclusive Signals"] },
];

export default function DashboardPage() {
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const fetchSubscription = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const sub = await getUserSubscription();
            if (sub) {
                setActiveSubscription(sub);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Could not fetch subscription details.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchSubscription();
    }, [user]);


    const handleChoosePlan = (pkg: Plan) => {
        setSelectedPlan(pkg);
        setDialogOpen(true);
    };

    const handleActivatePlan = async () => {
        if (selectedPlan) {
            try {
                await activateSubscription(selectedPlan.name);
                toast({ title: "Success!", description: `Your ${selectedPlan.name} plan is now active.` });
                fetchSubscription(); // Refresh subscription data
                setDialogOpen(false);
                setSelectedPlan(null);
            } catch (error) {
                 toast({
                    title: "Activation Failed",
                    description: (error as Error).message,
                    variant: "destructive"
                });
            }
        }
    };

    if (authLoading || isLoading) {
        return <div className="container mx-auto px-4 py-8">Loading your dashboard...</div>
    }

    if (activeSubscription && activeSubscription.status === 'Active') {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>
                <Card className="max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle>Current Subscription</CardTitle>
                        <CardDescription>You are subscribed to the {activeSubscription.plan} plan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                            <span className="font-semibold text-primary">{activeSubscription.plan} Plan</span>
                            <span className="text-2xl font-bold">Active</span>
                        </div>
                        <p className="text-muted-foreground">
                            Your plan will automatically renew on <span className="font-semibold text-foreground">{format(new Date(activeSubscription.renewalDate), 'PPP')}</span>.
                        </p>
                        <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <Bell className="h-5 w-5 mr-3 mt-1 text-blue-500" />
                            <div>
                                <h4 className="font-semibold">Reminder</h4>
                                <p className="text-sm text-muted-foreground">We will send you a reminder 3 days before your renewal date.</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button variant="outline" className="w-full">Manage Subscription</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to your Dashboard</h1>
        <p className="text-muted-foreground mb-8">Choose a plan to unlock the full potential of Etrade.</p>
        
        <div className="grid md:grid-cols-3 gap-8">
            {packages.map((pkg) => (
            <Card key={pkg.name} className="flex flex-col">
                <CardHeader>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription className="text-4xl font-bold text-primary">{pkg.price}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                <ul className="space-y-2 text-muted-foreground">
                    {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        {feature}
                    </li>
                    ))}
                </ul>
                </CardContent>
                <div className="p-6 pt-0">
                    <Button className="w-full" onClick={() => handleChoosePlan(pkg)}>Choose Plan</Button>
                </div>
            </Card>
            ))}
        </div>
        </div>
        
        {selectedPlan && (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Complete Your Payment</DialogTitle>
                    <DialogDescription>
                        Scan the QR code below to pay for the {selectedPlan.name} plan.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                    <Image
                        src="https://placehold.co/200x200.png?text=Scan+to+Pay"
                        alt="QR Code for payment"
                        width={200}
                        height={200}
                        data-ai-hint="qr code"
                    />
                     <p className="text-sm text-center text-muted-foreground">
                        You will be charged {selectedPlan.price.replace('/mo', '')}.<br/>
                        After successful payment, click the button below.
                    </p>
                    <Button onClick={handleActivatePlan} className="w-full">I Have Paid</Button>
                </div>
            </DialogContent>
        )}
    </Dialog>
  );
}
