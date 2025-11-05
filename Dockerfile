FROM ubuntu:22.04

# تثبيت curl + base64 + bash
RUN apt-get update && apt-get install -y curl bash coreutils

# نسخ السكربت
COPY run.sh /run.sh
RUN chmod +x /run.sh

# تنفيذ السكربت
CMD ["/run.sh"]