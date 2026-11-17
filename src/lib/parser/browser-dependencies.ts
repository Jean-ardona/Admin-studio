// prisma-ast only uses these dependencies for optional config discovery and printing.
// Browser parsing needs neither filesystem config nor the host operating system.
export const EOL = "\n";

export const lilconfigSync = () => ({
  search: () => null,
});
