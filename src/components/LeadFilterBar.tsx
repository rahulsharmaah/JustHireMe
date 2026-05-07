import Icon from "./Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LeadSort, SeniorityFilter } from "../types";

export function LeadFilterBar({
  search, setSearch, platform, setPlatform, minSignal, setMinSignal,
  minMatch, setMinMatch, sort, setSort, budgetOnly, setBudgetOnly,
  learningOnly, setLearningOnly, remoteOnly, setRemoteOnly, uncontactedOnly, setUncontactedOnly,
  hideDiscarded, setHideDiscarded, seniority, setSeniority, platforms, total, shown, label,
}: {
  search: string; setSearch: (v: string) => void;
  platform: string; setPlatform: (v: string) => void;
  minSignal: number; setMinSignal: (v: number) => void;
  minMatch: number; setMinMatch: (v: number) => void;
  sort: LeadSort; setSort: (v: LeadSort) => void;
  budgetOnly: boolean; setBudgetOnly: (v: boolean) => void;
  learningOnly: boolean; setLearningOnly: (v: boolean) => void;
  remoteOnly: boolean; setRemoteOnly: (v: boolean) => void;
  uncontactedOnly: boolean; setUncontactedOnly: (v: boolean) => void;
  hideDiscarded: boolean; setHideDiscarded: (v: boolean) => void;
  seniority: SeniorityFilter; setSeniority: (v: SeniorityFilter) => void;
  platforms: string[]; total: number; shown: number; label: string;
}) {
  const hasFilters = Boolean(search || platform || minSignal || minMatch || budgetOnly || learningOnly || remoteOnly || uncontactedOnly || hideDiscarded || seniority !== "all");
  const resetFilters = () => {
    setSearch("");
    setPlatform("");
    setMinSignal(0);
    setMinMatch(0);
    setBudgetOnly(false);
    setLearningOnly(false);
    setRemoteOnly(false);
    setUncontactedOnly(false);
    setHideDiscarded(false);
    setSeniority("all");
    setSort("recommended");
  };
  const toggleClass = (active: boolean) =>
    `pipeline-toggle h-[30px] rounded-[8px] border px-[9px] text-[11.5px] font-bold shadow-none ${active ? "border-[color:var(--blue)] bg-[color:var(--blue-soft)] text-[color:var(--blue-ink)]" : "border-[color:var(--line)] bg-[color:var(--paper)] text-[color:var(--ink-2)]"}`;

  return (
    <div className="pipeline-filterbar">
      <label className="pipeline-searchbox">
        <Icon name="search" size={14} />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${label}`}
          className="h-auto border-0 bg-transparent px-0 py-0 text-[13px] shadow-none focus-visible:ring-0 focus-visible:border-0 dark:bg-transparent"
        />
      </label>

      <div className="pipeline-filter-fields">
        <label className="pipeline-field">
          <span>Source</span>
          <Select value={platform || "__all__"} onValueChange={v => setPlatform(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-[34px] w-full rounded-[10px] border-[color:var(--line)] bg-[rgba(255,255,255,0.68)] px-[9px] text-[12px] text-[color:var(--ink)] shadow-none focus-visible:ring-0">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All sources</SelectItem>
              {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <label className="pipeline-field">
          <span>Level</span>
          <Select value={seniority} onValueChange={v => setSeniority(v as SeniorityFilter)}>
            <SelectTrigger className="h-[34px] w-full rounded-[10px] border-[color:var(--line)] bg-[rgba(255,255,255,0.68)] px-[9px] text-[12px] text-[color:var(--ink)] shadow-none focus-visible:ring-0">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="fresher">Fresher</SelectItem>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="mid">Mid</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="pipeline-field">
          <span>Sort</span>
          <Select value={sort} onValueChange={v => setSort(v as LeadSort)}>
            <SelectTrigger className="h-[34px] w-full rounded-[10px] border-[color:var(--line)] bg-[rgba(255,255,255,0.68)] px-[9px] text-[12px] text-[color:var(--ink)] shadow-none focus-visible:ring-0">
              <SelectValue placeholder="Recommended" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="signal">Signal score</SelectItem>
              <SelectItem value="match">Match score</SelectItem>
              <SelectItem value="company">Company</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="pipeline-field compact">
          <span>Signal</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={minSignal}
            onChange={e => setMinSignal(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            title="Minimum signal score"
            className="h-[34px] rounded-[10px] border-[color:var(--line)] bg-[rgba(255,255,255,0.68)] px-[9px] text-[12px] text-[color:var(--ink)] shadow-none focus-visible:ring-0"
          />
        </label>
        <label className="pipeline-field compact">
          <span>Fit</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={minMatch}
            onChange={e => setMinMatch(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            title="Minimum fit score"
            className="h-[34px] rounded-[10px] border-[color:var(--line)] bg-[rgba(255,255,255,0.68)] px-[9px] text-[12px] text-[color:var(--ink)] shadow-none focus-visible:ring-0"
          />
        </label>
      </div>

      <div className="pipeline-filter-actions">
        <Button type="button" variant="outline" className={toggleClass(budgetOnly)} onClick={() => setBudgetOnly(!budgetOnly)}>Budget</Button>
        <Button type="button" variant="outline" className={toggleClass(learningOnly)} onClick={() => setLearningOnly(!learningOnly)}>Learned</Button>
        <Button type="button" variant="outline" className={toggleClass(remoteOnly)} onClick={() => setRemoteOnly(!remoteOnly)}>Remote</Button>
        <Button type="button" variant="outline" className={toggleClass(uncontactedOnly)} onClick={() => setUncontactedOnly(!uncontactedOnly)}>Uncontacted</Button>
        <Button type="button" variant="outline" className="pipeline-clear h-[30px] rounded-[8px] border-[color:var(--line)] bg-[color:var(--paper)] px-[9px] text-[11.5px] font-bold text-[color:var(--ink-2)] shadow-none" onClick={resetFilters} disabled={!hasFilters}>Clear</Button>
        <Badge variant="outline" className="pipeline-count mono inline-grid min-h-[30px] place-items-center rounded-[8px] border-[color:var(--line)] bg-[color:var(--card)] px-[9px] py-0 text-[11.5px] font-bold text-[color:var(--ink-3)] shadow-none">{shown}/{total}</Badge>
      </div>
    </div>
  );
}
