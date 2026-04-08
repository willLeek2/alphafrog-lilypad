import ActionButton from "./ActionButton";

type FooterProps = {
  onAdminEntry: () => void;
  adminActive?: boolean;
};

const Footer = ({ onAdminEntry, adminActive }: FooterProps) => (
  <footer className="border-t border-white/60 bg-white/70 px-6 py-6 text-sm text-ink-700">
    <div className="mx-auto flex w-full max-w-6xl justify-end">
      <ActionButton variant={adminActive ? "outline" : "ghost"} onClick={onAdminEntry}>
        {adminActive ? "进入管理员后台" : "管理员入口"}
      </ActionButton>
    </div>
  </footer>
);

export default Footer;
