import setuptools


with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="quickPollServer",
    version="0.1.0",
    author="Jan Mrázek",
    author_email="email@honzamrazek.cz",
    description="Simple realtime online polls for remote teaching at FI MUNI",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yaqwsx/quickPoll",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    install_requires=[
        "Flask",
        "Flask-SocketIO",
        "gevent",
        "RandomWords"
    ],
    setup_requires=[

    ],
    zip_safe=False,
    include_package_data=True
)