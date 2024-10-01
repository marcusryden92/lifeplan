import {
  FormField,
  Form,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { HiOutlinePlus } from "react-icons/hi";

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
                <div className="flex flex-1 gap-2 max-w-[350px]">
                  <FormControl>
                    <Input {...field} placeholder="Task name" />
                  </FormControl>
                  <button type="submit">
                    <HiOutlinePlus className="w-8 h-8 text-gray-400 hover:text-gray-300" />
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
