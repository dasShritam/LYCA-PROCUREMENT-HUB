import { motion } from "framer-motion";
import { Truck } from "lucide-react";

export default function TruckLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      
      <div className="relative w-64 h-10 overflow-hidden">
        
        <motion.div
          initial={{ x: -80 }}
          animate={{ x: 260 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-0"
        >
          <Truck size={36} className="text-emerald-500" />
        </motion.div>

        <div className="absolute bottom-0 w-full border-t-2 border-dashed border-zinc-300" />
      </div>

      <p className="text-sm font-semibold text-emerald-600">
        Fetching Fresh Stock...
      </p>
    </div>
  );
}