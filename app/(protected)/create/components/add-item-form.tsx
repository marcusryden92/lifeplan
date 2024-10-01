import {
  FormField,
  Form,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { FaPlus } from "react-icons/fa";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Schemas
import { TaskListSchema } from "@/schemas";

import { onSubmit } from "@/utils/creation-pages-functions";
import { useDataContext } from "@/context/DataContext";
import { useState } from "react";

import * as z from "zod";

const AddItemForm = () => {
  const { setTaskArray } = useDataContext();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");

  const form = useForm<z.infer<typeof TaskListSchema>>({
    resolver: zodResolver(TaskListSchema),
    defaultValues: {
      title: "",
    },
  });

  const handleFormSubmit = (values: z.infer<typeof TaskListSchema>) => {
    onSubmit({
      values,
      setTaskArray,
      editIndex,
      setEditIndex,
      editTitle,
      setEditTitle,
      form,
      setDefaultInfluence: true,
      type: "goal",
    });
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-8 flex flex-col"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-5 justify-between">
                <div className="flex flex-1 gap-5 max-w-[350px]">
                  <FormControl>
                    <Input {...field} placeholder="Task name" />
                  </FormControl>
                  <button type="submit">
                    <FaPlus className="w-6 h-6 text-gray-500 hover:text-gray-300" />
                  </button>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default AddItemForm;
