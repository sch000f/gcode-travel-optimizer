#!/usr/bin/perl
# Refreshes the read-only copies in src/ from index.html (run: perl sync-src.pl)
use strict; use warnings;
local $/; open my $f, '<', 'index.html' or die $!; my $html = <$f>; close $f;
$html =~ s/\r\n/\n/g;
my @css = $html =~ m{<style>\n(.*?)</style>}gs;
my @js  = $html =~ m{<script>\n(.*?)</script>}gs;
die "unexpected structure\n" unless @css == 1 && @js == 3;
$js[2] =~ s/\n+\z/\n/;
my $note = "Read-only copy of the code embedded in index.html, for easier reading.\n";
my $note2 = "The tool itself runs from index.html; changes must be made there.";
my %out = (
  'src/style.css'    => "/* $note * $note2 */\n\n$css[0]",
  'src/bgcode.js'    => "// $note// $note2\n\n$js[0]",
  'src/optimizer.js' => "// $note// $note2\n\n$js[1]",
  'src/app.js'       => "// $note// $note2\n\n$js[2]",
);
for my $p (sort keys %out) { open my $w, '>', $p or die $!; print $w $out{$p}; close $w; print "wrote $p\n"; }
