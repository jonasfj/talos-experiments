FROM          quay.io/mozilla/base-test:0.0.1
MAINTAINER    Jonas Finnemann Jensen <jopsen@gmail.com>

# Add utilities and configuration
ADD           test-setup.sh   /tmp/test-setup.sh
ADD           dot-config      /home/worker/.config
ADD           dot-pulse       /home/worker/.pulse
ADD           resources       /home/worker/resources
ADD           tp5n.zip        /tmp/tp5n.zip

# Run test setup script as root
USER          root
RUN           ["/tmp/test-setup.sh"]

# Setup runtime user and environment variables
USER          worker
ENV           DISPLAY         :0
ENV           PATH            $PATH:/home/worker/talos/bin

# Set entry point that will download input and launch display server
ENTRYPOINT    ["/home/worker/resources/run-talos.sh"]
