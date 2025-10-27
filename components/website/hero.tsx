import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WordAnimation } from "@/components/website/word-animation";

export function Hero() {
  return (
    <section className="mt-[60px] lg:mt-[180px] min-h-[530px] relative lg:h-[calc(100vh-300px)]">
      <div className="flex flex-col">
        <Link href="/login">
          <Button
            variant="outline"
            className="rounded-full border-border flex space-x-2 items-center w-fit"
          >
            <span className="font-mono text-xs">Koffers v1.0</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={12}
              height={12}
              fill="none"
            >
              <path
                fill="currentColor"
                d="M8.783 6.667H.667V5.333h8.116L5.05 1.6 6 .667 11.333 6 6 11.333l-.95-.933 3.733-3.733Z"
              />
            </svg>
          </Button>
        </Link>

        <h2 className="mt-6 md:mt-10 max-w-[580px] text-[#878787] leading-tight text-[24px] md:text-[36px] font-medium">
          Personal finance tracking, budgeting, AI insights & your own
          financial assistant made for <WordAnimation />
        </h2>

        <div className="mt-8 md:mt-10">
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button
                variant="outline"
                className="border-transparent h-11 px-6 dark:bg-[#1D1D1D] bg-[#F2F1EF]"
              >
                Learn more
              </Button>
            </Link>

            <Link href="/login">
              <Button className="h-11 px-5">Start free trial</Button>
            </Link>
          </div>
        </div>

        <p className="text-xs text-[#707070] mt-4 font-mono">
          Start free trial, no credit card required.
        </p>
      </div>
    </section>
  );
}
