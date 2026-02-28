'use client';
import { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { CheckCircle, Copy, LayoutGrid, Briefcase, BarChart2, ArrowUp, ArrowDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { traders, instruments } from "@/lib/data";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import Link from "next/link";
import type { LandingSettings } from '@/lib/schema';

export default function Home() {
  const defaultSettings = {
    hero: {
      title: "The Social Intelligence Platform\nthat helps you invest in a smart way",
      subtitle: "Go long or short? Go Etrade! Connect with experienced traders and boost your trading journey.",
      buttonText: "Join Now",
      image: "/Home banner image.png",
    },
    stats: [
      { label: "Countries", value: "150+" },
      { label: "Accounts", value: "30M+" },
      { label: "Leaders", value: "2M+" },
    ],
    trust: {
      title: "Trust is… Trading is not easy",
      points: [
        "Staying focused takes time",
        "Building and maintaining strategy is hard",
        "Many investors end up losing",
      ],
      image: "/2nd image.png",
    },
    why: {
      title: "Why Etrade?",
      subtitle: "Powerful tools to grow your portfolio",
      items: [
        "Copy trading to your fingertips",
        "Multiple asset access",
        "Integrated brokers",
        "Advanced analytics",
      ],
    },
    leadersTitle: "Etrade Top Leaders",
    instrumentsTitle: "Wide variety of instruments",
    benefits: {
      title: "Benefits",
      subtitle: "Everything you need for smarter trading",
      items: [
        "Transparent platform",
        "Advanced tools",
        "Innovative solutions",
        "Customer support",
        "Learning environment",
        "Unique features",
      ],
    },
    design: {
      // primaryColor was previously supported but removed after
      // admin feedback. we only keep font overrides now to avoid
      // runtime problems with tailwind variables becoming
      // transparent when the value is empty.
      globalFont: "",
    },
  };

  const [settings, setSettings] = useState<LandingSettings>(defaultSettings as LandingSettings);
  const whyEtradeItems = settings.why?.items || [];
  const whyServices = settings.why?.services || [];

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/landing-settings');
        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length) {
            setSettings(prev => ({ ...prev, ...data }));
          }
        }
      } catch (err) {
        console.error('failed loading landing settings', err);
      }
    };
    load();
  }, []);

  // apply design overrides (font only)
  useEffect(() => {
    if (settings.design?.globalFont) {
      document.documentElement.style.fontFamily = settings.design.globalFont;
    }
    // primaryColor support has been removed per admin request; we no
    // longer mutate CSS variables for buttons or other elements. Keeping
    // this effect small reduces side‑effects and prevents the mysterious
    // disappearing buttons that arose when the value was blank.
  }, [settings.design?.globalFont]);

  return (
    <div className="text-foreground" style={settings.design ? { fontFamily: settings.design.globalFont || undefined } : undefined}>
      {/* Hero */}
      <section className="py-16 px-6 bg-card text-center">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            {settings.hero?.title ? (
              settings.hero.title.split('\n').map((line: string, i: number) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))
            ) : (
              <>
                The <span className="text-primary">Social Intelligence Platform</span>
                <br /> that helps you invest in a smart way
              </>
            )}
          </motion.h1>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            {settings.hero?.subtitle || "Go long or short? Go Etrade! Connect with experienced traders and boost your trading journey."}
          </p>
          <Button asChild size="lg" className="px-8 py-3 text-lg mb-10">
            <Link href="/signup">{settings.hero?.buttonText || "Join Now"}</Link>
          </Button>
          <div>
            <Image
                src={settings.hero?.image || '/Home banner image.png'}
                alt="Home banner"
                width={1000}
                height={600}
                className="rounded-2xl w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {(settings.stats && settings.stats.length > 0
            ? settings.stats
            : [
                { label: "Countries", value: "150+" },
                { label: "Accounts", value: "30M+" },
                { label: "Leaders", value: "2M+" },
              ]
          ).map((item: any, i: number) => (
            <Card key={i} className="rounded-2xl shadow">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-primary">{item.value}</div>
                <div className="text-muted-foreground">{item.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <Image
            src={settings.trust?.image || '/2nd image.png'}
            alt="Trust"
            width={600}
            height={500}
            className="rounded-2xl w-full object-cover"
          />
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">{settings.trust?.title || "Trust is… Trading is not easy"}</h2>
            <ul className="space-y-4 text-muted-foreground">
              {(settings.trust?.points && settings.trust.points.length > 0
                ? settings.trust.points
                : [
                    "Staying focused takes time",
                    "Building and maintaining strategy is hard",
                    "Many investors end up losing",
                  ]
              ).map((point: string, idx: number) => (
                <li className="flex items-start" key={idx}>
                  <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Why Etrade */}
      <section className="py-16 px-6 bg-card">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold">{settings.why?.title || "Why Etrade?"}</h2>
          <p className="text-muted-foreground mt-2">{settings.why?.subtitle || "Powerful tools to grow your portfolio"}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {whyServices && whyServices.length > 0 ? (
            whyServices.map((svc, i) => (
              <div key={i} className="flex flex-col items-center text-center p-4">
                {svc.icon && (
                  <div className="w-16 h-16 mb-2">
                    <Image src={svc.icon} width={64} height={64} alt={svc.title} />
                  </div>
                )}
                <h3 className="font-semibold">{svc.title}</h3>
                {svc.description && <p className="text-sm text-muted-foreground">{svc.description}</p>}
              </div>
            ))
          ) : (
            (whyEtradeItems && Array.isArray(whyEtradeItems) && whyEtradeItems.length > 0
              ? whyEtradeItems
              : [
                  "Copy trading to your fingertips",
                  "Multiple asset access",
                  "Integrated brokers",
                  "Advanced analytics",
                ]
            ).map((item, i) => {
              const text = typeof item === 'string' ? item : ((item as any)?.text || 'Feature');
              return (
                <div 
                  key={i} 
                  className="rounded-2xl shadow-lg relative group transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 h-52" 
                  style={{ 
                      backgroundImage: "url('/cards.jpg')",
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                  }}
                >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors rounded-2xl"></div>
                <div className="relative z-10 p-6 absolute bottom-0 left-0 right-0">
                  <p className="text-lg font-semibold text-white">{text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Leaders */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">{settings.leadersTitle || 'Etrade Top Leaders'}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {traders.slice(0, 3).map((trader) => (
              <Card key={trader.id} className="rounded-2xl shadow">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Avatar className="h-12 w-12 border">
                        {trader.avatar && (
                            <AvatarImage src={trader.avatar.imageUrl} alt={trader.name} />
                        )}
                        <AvatarFallback>{trader.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{trader.name}</p>
                        <p className="text-sm text-green-600">+{trader.returns}% Growth</p>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trader.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                          <YAxis domain={['dataMin', 'dataMax']} hide/>
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false}/>
                      </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Instruments */}
      <section className="py-16 px-6 bg-card">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">{settings.instrumentsTitle || 'Wide variety of instruments'}</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {instruments.map((instrument) => (
                <Card key={instrument.name} className="rounded-2xl shadow-md">
                    <CardContent className="p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">{instrument.name}</span>
                            <span className={`flex items-center text-xs ${instrument.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {instrument.change > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                                {Math.abs(instrument.change).toFixed(2)}%
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col items-center rounded-md p-2 bg-green-100 dark:bg-green-900/50">
                                <span className="text-xs text-green-600 dark:text-green-400">BUY</span>
                                <span className="font-mono text-lg font-semibold text-green-700 dark:text-green-300">{instrument.buyPrice.toFixed(4)}</span>
                            </div>
                            <div className="flex flex-col items-center rounded-md p-2 bg-red-100 dark:bg-red-900/50">
                                <span className="text-xs text-red-600 dark:text-red-400">SELL</span>
                                <span className="font-mono text-lg font-semibold text-red-700 dark:text-red-300">{instrument.sellPrice.toFixed(4)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold">{settings.benefits?.title || 'Benefits'}</h2>
          {settings.benefits?.subtitle && (
            <p className="text-muted-foreground mt-2">{settings.benefits.subtitle}</p>
          )}
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {(settings.benefits?.items && settings.benefits.items.length > 0
            ? settings.benefits.items
            : [
                "Transparent platform",
                "Advanced tools",
                "Innovative solutions",
                "Customer support",
                "Learning environment",
                "Unique features",
              ]
          ).map((item: string, i: number) => (
            <Card key={i} className="rounded-2xl shadow">
              <CardContent className="p-6 text-center">{item}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
