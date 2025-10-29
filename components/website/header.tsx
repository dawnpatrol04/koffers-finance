"use client";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/ui/icons";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const listVariant = {
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
  hidden: {
    opacity: 0,
  },
};

const itemVariant = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export function Header() {
  const pathname = usePathname();
  const [isOpen, setOpen] = useState(false);
  const [showBlur, setShowBlur] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastPath = `/${pathname.split("/").pop()}`;

  useEffect(() => {
    const setPixelRatio = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      document.documentElement.style.setProperty(
        "--pixel-ratio",
        `${1 / pixelRatio}`,
      );
    };

    setPixelRatio();
    window.addEventListener("resize", setPixelRatio);

    return () => window.removeEventListener("resize", setPixelRatio);
  }, []);

  const handleToggleMenu = () => {
    setOpen((prev) => {
      document.body.style.overflow = prev ? "" : "hidden";
      return !prev;
    });
  };

  const handleOnClick = () => {
    setShowBlur(false);
    setHidden(true);

    setTimeout(() => {
      setHidden(false);
    }, 100);
  };

  const links = [
    {
      title: "Blog",
      path: "/blog",
    },
    {
      title: "About",
      path: "/about",
    },
    {
      title: "Careers",
      path: "/careers",
    },
  ];

  if (pathname.includes("pitch")) {
    return null;
  }

  return (
    <header className="sticky mt-4 top-4 z-50 px-2 md:px-4 md:flex justify-center">
      <nav className="border border-border px-4 flex items-center backdrop-filter backdrop-blur-xl bg-[#FFFFFF] dark:bg-[#121212] bg-opacity-70 h-[50px] z-20 relative">
        <Link href="/">
          <span className="sr-only">Koffers Logo</span>
          <Icons.LogoSmall className="size-6" />
        </Link>

        <ul className="space-x-2 font-medium text-sm hidden md:flex mx-3">
          {links.map(({ path, title }) => {
            return (
              <li key={path}>
                <Link
                  onClick={handleOnClick}
                  href={path}
                  className="h-8 items-center justify-center text-sm font-medium px-3 py-2 inline-flex text-secondary-foreground transition-opacity hover:opacity-70 duration-200"
                >
                  {title}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="ml-auto md:hidden p-2"
          onClick={() => handleToggleMenu()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={18}
            height={13}
            fill="none"
          >
            <path
              fill="currentColor"
              d="M0 12.195v-2.007h18v2.007H0Zm0-5.017V5.172h18v2.006H0Zm0-5.016V.155h18v2.007H0Z"
            />
          </svg>
        </button>

        <Link
          className="text-sm font-medium pr-2 border-l-[1px] border-border pl-4 hidden md:block"
          href="/login"
        >
          Sign in
        </Link>
      </nav>

      {isOpen && (
        <motion.div
          className="fixed bg-background -top-[2px] right-0 left-0 bottom-0 h-screen z-10 px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="mt-4 flex justify-between p-3 px-4 relative ml-[1px]">
            <button type="button" onClick={handleToggleMenu}>
              <span className="sr-only">Koffers Logo</span>
              <Icons.LogoSmall />
            </button>

            <button
              type="button"
              className="ml-auto md:hidden p-2 absolute right-[10px] top-2"
              onClick={handleToggleMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                height={24}
                className="fill-primary"
              >
                <path fill="none" d="M0 0h24v24H0V0z" />
                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
              </svg>
            </button>
          </div>

          <div className="h-screen pb-[150px] overflow-auto">
            <motion.ul
              initial="hidden"
              animate="show"
              className="px-3 pt-8 text-xl text-[#878787] space-y-8 mb-8 overflow-auto"
              variants={listVariant}
            >
              {links.map(({ path, title }) => {
                const isActive = path === lastPath;

                return (
                  <motion.li variants={itemVariant} key={path}>
                    <Link
                      href={path}
                      className={cn(isActive && "text-primary")}
                      onClick={handleToggleMenu}
                    >
                      {title}
                    </Link>
                  </motion.li>
                );
              })}

              <motion.li
                className="mt-auto border-t-[1px] pt-8"
                variants={itemVariant}
              >
                <Link
                  className="text-xl text-primary"
                  href="/login"
                >
                  Sign in
                </Link>
              </motion.li>
            </motion.ul>
          </div>
        </motion.div>
      )}

      <div
        className={cn(
          "fixed w-screen h-screen backdrop-blur-md left-0 top-0 invisible opacity-0 transition-all duration-300 z-10",
          showBlur && "md:visible opacity-100",
        )}
      />
    </header>
  );
}
