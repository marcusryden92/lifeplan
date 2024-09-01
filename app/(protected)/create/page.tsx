"use client";

import { CardHeader, CardContent } from "@/components/ui/card";
import { CardWrapper } from "@/components/auth/card-wrapper";
import {
  FormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TaskListSchema } from "@/schemas";
import { useState } from "react";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { PencilIcon } from "@heroicons/react/24/outline";

export default function CreatePage() {
  const [taskArray, setTaskArray] = useState<z.infer<typeof TaskListSchema>[]>(
    []
  );

  const form = useForm<z.infer<typeof TaskListSchema>>({
    resolver: zodResolver(TaskListSchema),
    defaultValues: {
      title: "",
    },
  });

  const onSubmit = (values: z.infer<typeof TaskListSchema>) => {
    setTaskArray((prevTasks) => [...prevTasks, values]);
    form.reset(); // Reset form after submission
  };

  const deleteTask = (index: number) => {
    setTaskArray((prevTasks) => prevTasks.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full h-full bg-white rounded-xl bg-opacity-95 px-10">
      <CardHeader className="border-b px-0 py-6">
        <p className="text-xl font-semibold">Create</p>
      </CardHeader>
      <CardContent className="max-w-1/2 px-0 py-6 border-b">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 space-x-8 flex flex-row"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormDescription>
                    Write down something on your mind
                  </FormDescription>
                  <div className="flex gap-5">
                    <FormControl>
                      <Input {...field} placeholder="Task name" />
                    </FormControl>
                    <Button type="submit">Add item</Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <div className="flex flex-col py-6">
        {taskArray.map((task, index) => (
          <div
            key={index}
            className="flex flex-row items-center justify-between rounded-lg mb-2 max-w-[350px] group hover:shadow-md py-2 px-4 space-x-3"
          >
            <div className="max-w-[300px] break-words overflow-hidden text-ellipsis">
              {task.title}
            </div>

            <div className="flex flex-row space-x-2 items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div
                // onClick={() => editTask(index)}
                className="cursor-pointer text-gray-400 hover:text-red-400"
              >
                <PencilIcon className="w-5 h-5" />
              </div>
              <div
                onClick={() => deleteTask(index)}
                className="cursor-pointer text-gray-400 hover:text-red-400"
              >
                <XMarkIcon className="w-7 h-7" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
