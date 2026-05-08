import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedButton({ children, className, ...props }: AnimatedButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-md p-4 px-8 py-3 font-medium text-white bg-black dark:bg-white dark:text-black shadow-lg hover:shadow-xl transition-all duration-300",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 z-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]" />
    </motion.button>
  );
}
