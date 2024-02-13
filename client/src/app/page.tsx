"use client";

import { Box, Button, Container, HStack, Input, Modal, ModalContent, ModalOverlay, Stack, useDisclosure } from "@chakra-ui/react";
import axios from "axios";
import { useCallback, useState } from "react";
import { baseUrl } from "../utils/baseUrl";
import { UserState } from "../context/userState";

const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

export default function Home() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: notHaveAnAccount, onToggle } = useDisclosure();

  const [ytbUrl, setytbUrl] = useState("");
  const [firstName, setfirstName] = useState("");
  const [lastName, setlastName] = useState("");
  const [email, setemail] = useState("");
  const [password, setpassword] = useState("");
  const { isAuth, setisAuth } = UserState();

  const handleSubmit = useCallback(async () => {
    try {
      if (!validateEmail(email)) {
        alert("Please enter valid email");
        return;
      }
      if (notHaveAnAccount) {
        const { data } = await axios.post(`${baseUrl}/api/user/signup`, {
          email,
          password,
          firstName,
          lastName,
          signUptype: "manual",
        });
        setisAuth(data?.authKey);
        window.localStorage.setItem("token", data?.authKey);
        window.localStorage.setItem("ytbUser", JSON.stringify(data?.user));
        await handleStartNow(1, data?.authKey);
        window.localStorage.removeItem("ytbUrl");
        onClose();
        window.location.assign("/dashboard");
      } else {
        const { data } = await axios.post(`${baseUrl}/api/user/login`, {
          email,
          password,
        });
        setisAuth(data?.authKey);
        window.localStorage.setItem("token", data?.authKey);
        window.localStorage.setItem("ytbUser", JSON.stringify(data?.user));
        await handleStartNow(1, data?.authKey);
        window.localStorage.removeItem("ytbUrl");
        onClose();
        window.location.assign("/dashboard");
      }
    } catch (error) {
      alert("User not found");
      console.error(error);
    }
  }, [notHaveAnAccount, email, password, firstName, lastName]);

  const handleStartNow = useCallback(
    async (type = 1, token = undefined) => {
      if (!ytbUrl.includes("www.youtube.com")) {
        alert("Please enter valid youtube url");
        return;
      }
      if (token) {
        console.log(token);

        try {
          const { data } = await axios.post(
            `${baseUrl}/api/ytbvideo/send`,
            {
              url: ytbUrl,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          // console.log("---ytb data---", data);
          setytbUrl("");
          if (type === 2 && data && data?.msg === "success") {
            window.location.assign("/dashboard");
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        window.localStorage.setItem("ytbUrl", ytbUrl);
        onOpen();
      }
    },
    [ytbUrl]
  );

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("ytbUser");
    window.localStorage.removeItem("ytbUrl");
    window.location.reload();
  }, []);

  const handleLoginSignUp = useCallback(
    (p: Boolean) => {
      if (p ? notHaveAnAccount : !notHaveAnAccount) {
        onOpen();
      } else {
        onToggle();
        onOpen();
      }
    },
    [notHaveAnAccount]
  );

  return (
    <Box position={"relative"}>
      <HStack position={"absolute"} top={"5%"} right={"10%"}>
        {isAuth ? (
          <>
            <Button size={"sm"} fontWeight={"500"} color={"black"} colorScheme={"white"} bg={"white"} onClick={() => window.location.assign("/dashboard")}>
              DASHBOARD
            </Button>
            <Button size={"sm"} fontWeight={"500"} color={"black"} colorScheme={"white"} bg={"white"} onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button
              size={"sm"}
              fontWeight={"500"}
              color={"black"}
              colorScheme={"white"}
              bg={"white"}
              onClick={() => {
                handleLoginSignUp(true);
              }}
            >
              Signup
            </Button>
            <Button
              size={"sm"}
              fontWeight={"500"}
              color={"black"}
              colorScheme={"white"}
              bg={"white"}
              onClick={() => {
                handleLoginSignUp(false);
              }}
            >
              Login
            </Button>
          </>
        )}
      </HStack>
      <Container h={"100vh"} display={"flex"} flexDirection={"column"} justifyContent={"center"} alignItems={"center"} gridGap={"60px"}>
        <Box fontSize={"30px"} textAlign={"center"}>
          YouTube Video to Text and Summery
        </Box>
        <Input
          onChange={(e) => setytbUrl(e.target.value)}
          focusBorderColor="black"
          variant="flushed"
          size={"lg"}
          placeholder="Provide your YouTube Video Link here"
        />
        <Button
          size={"sm"}
          w={"190px"}
          fontWeight={"400"}
          colorScheme={"black"}
          bg={"black"}
          onClick={() => {
            const token = window.localStorage.getItem("token");

            handleStartNow(2, token);
          }}
        >
          START NOW
        </Button>
      </Container>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <Container display={"flex"} flexDirection={"column"} justifyContent={"center"} alignItems={"center"} gridGap={"20px"} py={"20px"}>
            <Box fontSize={"30px"} textAlign={"center"}>
              {notHaveAnAccount ? "Register" : "Login"}
            </Box>
            {notHaveAnAccount && (
              <HStack w={"100%"} justifyContent={"space-between"}>
                <Input
                  name="firstName"
                  onChange={(e) => setfirstName(e.target.value)}
                  focusBorderColor="black"
                  variant="flushed"
                  size={"lg"}
                  placeholder="First Name"
                />
                <Input
                  name="lastName"
                  onChange={(e) => setlastName(e.target.value)}
                  focusBorderColor="black"
                  variant="flushed"
                  size={"lg"}
                  placeholder="Last Name"
                />
              </HStack>
            )}
            <Input name="email" onChange={(e) => setemail(e.target.value)} focusBorderColor="black" variant="flushed" size={"lg"} placeholder="Email Address" />
            <Input
              name="password"
              onChange={(e) => setpassword(e.target.value)}
              focusBorderColor="black"
              variant="flushed"
              size={"lg"}
              placeholder="Choose Password"
            />
            <Stack justifyContent={"center"} alignItems={"center"}>
              <Button size={"sm"} w={"190px"} fontWeight={"400"} colorScheme={"black"} bg={"black"} onClick={handleSubmit}>
                {/* {notHaveAnAccount ? 'SIGN UP' : 'LOGIN'} */}
                SUBMIT
              </Button>
              <Box>OR</Box>
              {notHaveAnAccount ? <Box>Already have an account</Box> : <Box>New user</Box>}
              <Button size={"sm"} w={"190px"} fontWeight={"400"} colorScheme={"black"} bg={"black"} onClick={onToggle}>
                {notHaveAnAccount ? "LOGIN" : "SIGN UP"}
              </Button>
            </Stack>
          </Container>
        </ModalContent>
      </Modal>
    </Box>
  );
}
