import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  Gift,
  Plus,
  Repeat,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white px-4 py-3 ${className}`}
    >
      {children}
    </div>
  );
}

function CardLabel({ title, link, to }) {
  return (
    <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
      <span>{title}</span>
      {link && (
        <Link
          to={to}
          className="text-[11px] font-medium normal-case tracking-normal text-[#6C63FF]"
        >
          {link}
        </Link>
      )}
    </div>
  );
}

function TodayEvent({ time, color, title, sub }) {
  return (
    <div className="flex gap-2.5 border-b border-slate-100 py-2 last:border-0 last:pb-0">
      <div className="w-12 pt-0.5 text-[11px] text-slate-400">{time}</div>
      <div
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <div>
        <div className="text-[13px] font-medium text-slate-900">{title}</div>
        <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

function PersonRow({ initials, name, sub, badge, badgeClass }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEEDFE] text-[11px] font-semibold text-[#534AB7]">
        {initials}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-slate-900">
          {name}
        </div>
        <div className="text-[11px] text-slate-500">{sub}</div>
      </div>
      <div
        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${badgeClass}`}
      >
        {badge}
      </div>
    </div>
  );
}

function SuggestionRow({ icon: Icon, bg, color, text, action }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-100 py-2 last:border-0">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ background: bg }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="flex-1 text-[12px] leading-5 text-slate-800">{text}</div>
      <button className="whitespace-nowrap text-[11px] font-medium text-[#6C63FF]">
        {action}
      </button>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-900">
              Good morning, <span className="text-[#6C63FF]">{name}</span> 👋
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Here&apos;s what&apos;s going on today
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
              <Calendar className="h-3 w-3" />
              Monday, May 25
            </div>

            <Link
              to="/calendar"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#6C63FF] px-3.5 py-2 text-[13px] font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Add event
            </Link>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardLabel
              title="Today"
              link="View full calendar →"
              to="/calendar"
            />

            <TodayEvent
              time="9:00 am"
              color="#6C63FF"
              title="Team standup"
              sub="Work · Zoom"
            />
            <TodayEvent
              time="12:30 pm"
              color="#2EC4B6"
              title="Liam's soccer practice"
              sub="Family · Riverside Park"
            />
            <TodayEvent
              time="3:00 pm"
              color="#2EC4B6"
              title="Pick up boys"
              sub="Family · school dropoff"
            />
            <TodayEvent
              time="7:00 pm"
              color="#F4A261"
              title="Monaco GP qualifying"
              sub="F1 races"
            />
          </Card>

          <Card>
            <CardLabel title="May 2026" />

            <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[10px]">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="text-slate-400">
                  {d}
                </div>
              ))}

              {[
                "27",
                "28",
                "29",
                "30",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "10",
                "11",
                "12",
                "13",
                "14",
                "15",
                "16",
                "17",
                "18",
                "19",
                "20",
                "21",
                "22",
                "23",
                "24",
                "25",
                "26",
                "27",
                "28",
                "29",
                "30",
                "31",
              ].map((day, i) => {
                const today = day === "24" && i === 27;
                const hasEvent = ["2", "5", "7", "10", "13", "20", "26", "29"].includes(day);

                return (
                  <div
                    key={`${day}-${i}`}
                    className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full ${
                      today
                        ? "bg-[#6C63FF] text-white"
                        : hasEvent
                        ? "font-semibold text-[#6C63FF]"
                        : i < 4
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card>
            <CardLabel title="Your people" link="Manage →" to="/team" />

            <PersonRow
              initials="JD"
              name="Jessica (co-parent)"
              sub="2 shared tables"
              badge="Active"
              badgeClass="bg-green-100 text-green-700"
            />
            <PersonRow
              initials="MM"
              name="Mom"
              sub="1 shared table"
              badge="Active"
              badgeClass="bg-green-100 text-green-700"
            />
            <PersonRow
              initials="SR"
              name="Sarah (sister)"
              sub="1 shared table"
              badge="Pending"
              badgeClass="bg-amber-100 text-amber-700"
            />
          </Card>

          <Card>
            <CardLabel title="Memories" link="View all →" to="/memories" />

            <div className="grid grid-cols-3 gap-1.5">
              <div className="flex aspect-square items-end rounded-md bg-gradient-to-br from-[#2EC4B6] to-[#0F6E56] p-1.5 text-[10px] font-medium text-white">
                Spring break
              </div>
              <div className="flex aspect-square items-end rounded-md bg-gradient-to-br from-[#6C63FF] to-[#3C3489] p-1.5 text-[10px] font-medium text-white">
                Liam&apos;s b-day
              </div>
              <div className="flex aspect-square items-end rounded-md bg-gradient-to-br from-[#F4A261] to-[#854F0B] p-1.5 text-[10px] font-medium text-white">
                Soccer finals
              </div>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Last added: 3 days ago
            </p>
          </Card>

          <Card>
            <CardLabel title="Smart suggestions" />

            <SuggestionRow
              icon={Repeat}
              bg="#EEEDFE"
              color="#534AB7"
              text="Boys have nothing scheduled next Saturday"
              action="Plan it →"
            />
            <SuggestionRow
              icon={Clock}
              bg="#E1F5EE"
              color="#0F6E56"
              text="Liam's practice conflicts with your 3pm meeting"
              action="Resolve →"
            />
            <SuggestionRow
              icon={Gift}
              bg="#FAEEDA"
              color="#854F0B"
              text="Mom's birthday is in 9 days"
              action="Add event →"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}