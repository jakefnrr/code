import React from "react";
import { LogIn, Mail, Lock, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function AuthLayout({ icon, title, subtitle, footer, ...props }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      {props.form && props.form()}
      {footer && <footer />}
    </div>
  );
}