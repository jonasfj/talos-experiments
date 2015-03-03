#!/bin/bash -ve

################################### setup.sh ###################################

### Check that we are running as root
test `whoami` == 'root';

# Create common xdg-folders
mkdir Documents; mkdir Pictures; mkdir Music; mkdir Videos;

# Create folder for build and artifacts
mkdir build;
mkdir artifacts;


# Install Xorg with dummy video driver
export DEBIAN_FRONTEND=noninteractive;
apt-get update;
apt-get install -y xserver-xorg-video-dummy;

# Install aws
pip install awscli;

# Install virtualenv
pip install virtualenv;

# Clone talos and install it
hg clone http://hg.mozilla.org/build/talos;
cd ~/talos;
python INSTALL.py;

# Extract and delete tp5n.zip
cd ~/talos/talos/page_load_test;
unzip /tmp/tp5n.zip;
rm /tmp/tp5n.zip;

# Grant ownership of home folder to worker user
chown -R worker:worker /home/worker/* /home/worker/.*

### Clean up from setup
# Remove the test-setup.sh setup, we don't really need this script anymore,
# deleting it keeps the image as clean as possible.
rm $0; echo "Deleted $0";

################################### setup.sh ###################################
