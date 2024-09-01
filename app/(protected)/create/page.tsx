import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { currentUser } from "@/lib/auth";
import { SettingsPageUser } from "@/next-auth";

import {
  FormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { TaskListSchema } from "@/schemas";

const form = useForm<z.infer<typeof TaskListSchema>>({
  resolver: zodResolver(TaskListSchema),
  defaultValues: {
    title: "",
  },
});

const onSubmit = (values: z.infer<typeof TaskListSchema>) => {
  console.log(values);
};

const SettingsPage = async () => {
  const user = (await currentUser()) as SettingsPageUser;

  return (
    <div className="w-full h-full bg-white rounded-xl bg-opacity-95">
      <CardHeader className="border-b">
        <p className="text-xl font-semibold">Create</p>
      </CardHeader>
      <CardContent></CardContent>
    </div>
  );
};
