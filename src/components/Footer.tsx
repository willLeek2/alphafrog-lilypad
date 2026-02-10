import ActionButton from "./ActionButton";

type FooterProps = {
  onAdminEntry: () => void;
  adminActive?: boolean;
};

const Footer = ({ onAdminEntry, adminActive }: FooterProps) => (
  <footer className="border-t border-white/60 bg-white/70 px-6 py-6 text-sm text-ink-700">
    <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-ink-500">AlphaFrog Admin</p>
        <p className="mt-1 text-base font-semibold text-ink-900">后台与爬取状态概览</p>
      </div>
      <ActionButton variant={adminActive ? "outline" : "ghost"} onClick={onAdminEntry}>
        {adminActive ? "进入管理员后台" : "管理员入口"}
      </ActionButton>
    </div>
  </footer>
);

export default Footer;
