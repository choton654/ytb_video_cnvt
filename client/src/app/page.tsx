"use client";

import { Box, Button, Container, HStack, Input, Modal, ModalContent, ModalOverlay, Stack, useDisclosure } from "@chakra-ui/react";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { baseUrl } from "../utils/baseUrl";
import { UserState } from "../context/userState";

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
      if (notHaveAnAccount) {
        const { data } = await axios.post(`${baseUrl}/api/user/signup`, {
          email,
          password,
          firstName,
          lastName,
          signUptype: "manual",
        });
        setisAuth(data?.authKey)
        window.localStorage.setItem("token", data?.authKey);
        window.localStorage.setItem("ytbUser", JSON.stringify(data?.user));
        onClose();
        window.location.assign("/dashboard")
      } else {
        const { data } = await axios.post(`${baseUrl}/api/user/login`, {
          email,
          password,
        });
        setisAuth(data?.authKey)
        window.localStorage.setItem("token", data?.authKey);
        window.localStorage.setItem("ytbUser", JSON.stringify(data?.user));
        onClose();
        window.location.assign("/dashboard")
      }
    } catch (error) {
      console.error(error);
    }
  }, [notHaveAnAccount, email, password, firstName, lastName]);

  const handleStartNow = useCallback(async () => {
    const token = window.localStorage.getItem("token");
    if (token) {
      try {
        if (!ytbUrl.includes("www.youtube.com")) {
          alert("Please enter valid youtube url");
          return;
        }
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
        console.log("---ytb data---", data);
        if (data && data?.msg === "success") {
          setytbUrl("");
          window.location.assign("/dashboard");
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      onOpen();
    }
  }, [ytbUrl]);

  return (
    <>
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
        <Button size={"sm"} w={"190px"} fontWeight={"400"} colorScheme={"black"} bg={"black"} onClick={handleStartNow}>
          START NOW
        </Button>
        {isAuth && <Button size={"sm"} w={"190px"} fontWeight={"400"} colorScheme={"black"} bg={"black"} onClick={() => window.location.assign("/dashboard")}>
          DASHBOARD
        </Button>}
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
    </>
  );
}
