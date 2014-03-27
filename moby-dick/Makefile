download.txt:
	wget http://www.gutenberg.org/files/2701/old/moby10b.txt
	mv moby10b.txt down
	awk ' BEGIN { ORS = ""; print "["; } { print "\/\@"$0"\/\@"; } END { print "]"; }' | sed "s^\"^\\\\\"^g;s^\/\@\/\@^\", \"^g;s^\/\@^\"^g"

oldwords.json:
	cat download.txt | sed 's/[^A-Za-z]/ /g;' | tr " " "\n" | sort | uniq | shuf | perl -e 'use JSON; @in=grep(s/\n$$//, <>); print encode_json(\@in)."\n";' > words.json

words.json:
	cat download.txt | sed 's/[^A-Za-z]/ /g;' | tr " " "\n" | perl -e 'use JSON; @in=grep(s/\n$$//, <>); print encode_json(\@in)."\n";' > words.json
